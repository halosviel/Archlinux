/* Bar.tsx | 2026 Apr 28 */

import app from "ags/gtk4/app"

import { Astal, Gtk, Gdk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { createPoll } from "ags/time"
import { Network } from "ags/service"
import { bind } from "ags/binding"

import Hyprland from "gi://AstalHyprland"
import GdkPixbuf from "gi://GdkPixbuf"
import Cava from "gi://AstalCava"
import Wp from "gi://AstalWp"



// ----------------------
// VARS
// ----------------------

// left
const CAVA_BAR_COUNT = 10
const CAVA_BAR_MAX_HEIGHT = 11
const CAVA_BAR_WIDTH = 4
const CAVA_BAR_HEIGHT = 2
const CAVA_FRAMERATE = 50

const WORKSPACE_COUNT = 7 // CHARS MUST BE SAME AMOUNT!!!
const WORKSPACE_CHARS = ["一", "二", "三", "四", "五", "六", "七"]

// center
const TIME_FORMAT = "date '+ %p %-I:%M • %S'" // see man date cmd!!
const DATE_FORMAT = "date '+󰸗 %a • %B %d'"

const GIF_PATH = "/home/halosviel/Local/Rice/Gifs/tohru.gif"
const GIF_SIZE = 30

// right
const VOLUME_ICONS = {
  0: "󰝟",
  15: "󰕿",
  40: "󰖀",
  100: "󰕾",
}
const WEATHER_UPDATE_INTERVAL = 60000
const CPU_TEMP_UPDATE_INTERVAL = 100
const NETWORK_SPEED_UPDATE_INTERVAL = 100

// ----------------------
// LEFT
// ----------------------


function SoundBars() {
  const cava = Cava.get_default()
  cava.bars = CAVA_BAR_COUNT
  cava.framerate = CAVA_FRAMERATE

  const box = new Gtk.Box({ spacing: 2 })
  box.heightRequest = CAVA_BAR_MAX_HEIGHT
  box.cssClasses = ["cava"]
  box.set_valign(Gtk.Align.CENTER)

  const barWidgets: Gtk.Box[] = []
  for (let i = 0; i < CAVA_BAR_COUNT; i++) {
    const bar = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL })
    bar.cssClasses = ["cava-bar"]
    bar.widthRequest = CAVA_BAR_WIDTH
    bar.heightRequest = CAVA_BAR_HEIGHT
    bar.set_valign(Gtk.Align.END)

    box.append(bar)
    barWidgets.push(bar)
  }

  cava.connect("notify::values", () => {
    const values = cava.get_values()

    for (let i = 0; i < CAVA_BAR_COUNT; i++) {
      const newHeight = Math.min(CAVA_BAR_MAX_HEIGHT, Math.max(2, Math.round((values[i] ?? 0) * CAVA_BAR_MAX_HEIGHT)))
      barWidgets[i].heightRequest = newHeight
    }
  })

  return box
}

function Workspaces() {
  if (WORKSPACE_CHARS.length !== WORKSPACE_COUNT) {
    throw new Error(
      `\n\nW_Workspaces(): WORKSPACE_CHARS did not match WORKSPACE_COUNT (${WORKSPACE_COUNT} expected, got ${WORKSPACE_CHARS.length})\n\n`
    )
  }
  const hypr = Hyprland.get_default()
  const buttons: Map<number, Gtk.Button> = new Map()

  const box = new Gtk.Box({ spacing: 4 })
  box.cssClasses = ["workspaces"]

  for (let i = 1; i <= WORKSPACE_COUNT; i++) {
    const btn = new Gtk.Button()
    btn.label = WORKSPACE_CHARS[i - 1]
    btn.cssClasses = ["ws-btn"]
    btn.connect("clicked", () => {
      hypr.dispatch("workspace", `${i}`)
    })

    box.append(btn)
    buttons.set(i, btn)
  }

  const update = () => {
    const active = hypr.get_focused_workspace()?.id
    buttons.forEach((btn, id) => {
      const occupied = hypr.get_workspaces().some(ws => ws.id === id)
      btn.cssClasses = id === active
        ? ["ws-btn", "active"]
        : occupied
        ? ["ws-btn", "occupied"]
        : ["ws-btn"]
    })
  }

  // dynamically update per hyprland.conf update
  hypr.connect("notify::focused-workspace", update)
  hypr.connect("workspace-added", update)
  hypr.connect("workspace-removed", update)

  update()
  return box
}



// ----------------------
// CENTER
// ----------------------

function Time() {
  return (
    <label
      label={createPoll("", 1000, TIME_FORMAT)}
      class="time"
    />
  )
}

function Gif() {
  let animation: GdkPixbuf.PixbufAnimation | null = null
  let iter: GdkPixbuf.PixbufAnimationIter | null = null

  let image = new Gtk.Image()
  image.pixelSize = GIF_SIZE
  //image.cssClasses = ["center-gif"]

  try {
    animation = GdkPixbuf.PixbufAnimation.new_from_file(GIF_PATH)
    iter = animation.get_iter(null)

    const updateFrame = () => {
      if (!iter) return true

      iter.advance(null)
      image.set_from_pixbuf(iter.get_pixbuf())

      const delay = iter.get_delay_time()
      setTimeout(updateFrame, delay > 0 ? delay : 100)

      return false
    }

    image.set_from_pixbuf(iter.get_pixbuf())
    setTimeout(updateFrame, iter.get_delay_time())
  } catch (err) {
    console.error(`Failed to load media (GIF): ${err}`)
  }

  return image
}

function Date() {
   return (
    <label
      label={createPoll("", 1000, DATE_FORMAT)}
      class="date"
    />
  )
}



// ----------------------
// RIGHT
// ----------------------

function Volume() {
  const audio = Wp.get_default()

  const getVolumeIcon = (vol: number) => {
    const percent = Math.round(vol * 100)
    const thresholds = Object.keys(VOLUME_ICONS)
      .map(Number)
      .sort((a, b) => a - b)

    for (const t of thresholds) {
      if (percent <= t) return VOLUME_ICONS[t]
    }

    return VOLUME_ICONS[100]
  }

  const label = new Gtk.Label()
  label.cssClasses = ["volume"]

  let speakerConnection: number | null = null
  let prevSpeaker: any | null = null

  const bindSpeaker = () => {
    const speaker = audio.default_speaker
    if (!speaker) return

    if (speakerConnection !== null && prevSpeaker !== null) {
      prevSpeaker.disconnect(speakerConnection)
      speakerConnection = null
    }

    prevSpeaker = speaker

    const update = () => {
      label.label = `${getVolumeIcon(speaker.volume)} ${Math.round(speaker.volume * 100)}%`
    }

    update()

    speakerConnection = speaker.connect("notify::volume", update)
    speaker.connect("notify::mute", update)
  }

  audio.connect("notify::default-speaker", bindSpeaker)
  bindSpeaker()

  return label
}

function Weather() {
 const weather = createPoll("", 300000, `curl -s "https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current=apparent_temperature,weather_code&timezone=Europe/London"`)

  const getIcon = (code: number) => {
    if (code === 0) return "󰖙"                                          // clear sky
    if (code === 1 || code === 2) return "󰖕"                            // partly cloudy
    if (code === 3) return "󰖐"                                          // overcast
    if (code === 45 || code === 48) return "󰖑"                          // fog
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "󰖗" // rain/drizzle
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "󰖘"             // snow
    if ([95, 96, 99].includes(code)) return "󰖓"                         // thunder
    return "󰖐"
  }

  return (
    <label
      class="weather"
      label={weather.as(out => {
        if (!out) return "…"

        try {
          const data = JSON.parse(out)
          const current = data.current

          if (!current) return "N/A"

          const temp = Math.round(current.apparent_temperature)
          const code = Number(current.weather_code)

          return `${getIcon(code)} ${temp}°C`
        } catch {
          return "ERR"
        }
      })}
    />
  )
}

function CpuTemperature() {
  const temp = createPoll("", CPU_TEMP_UPDATE_INTERVAL, "bash -c 'awk \"{printf \\\"%.1f\\\", \\$1/1000}\" $(grep -rl Tctl /sys/class/hwmon/hwmon*/temp*_label | sed s/temp.*_label/temp1_input/)'")
  
  const getIcon = (t: string) => {
    const num = parseFloat(t)
    if (isNaN(num)) return ""
    if (num < 50) return ""
    if (num < 75) return ""
    if (num < 100) return ""

    return ""
  }

  return (
    <label
      label={temp((t: string) => `${getIcon(t)} CPU ${t}°C`)}
      class="temperature"
    />
  )
}

function NetworkSpeed() {
  const label = new Gtk.Label()
  label.cssClasses = ["network"]

  let prev = { rx: 0, tx: 0 }

  setInterval(() => {
    execAsync("awk '/enp8s0/{print $2, $10}' /proc/net/dev")
      .then((out: string) => {
        const [rx, tx] = out.trim().split(" ").map(Number)
        const down = ((rx - prev.rx) / 1024 / 1024 * 8 * 10).toFixed(1)
        const up = ((tx - prev.tx) / 1024 / 1024 * 8 * 10).toFixed(1)
        if (prev.rx !== 0) label.label = `󰓅  󰇚 ${down}Mbp/s 󰕒 ${up}Mbp/s`
        prev = { rx, tx }
      })
      .catch(console.error)
  }, NETWORK_SPEED_UPDATE_INTERVAL)

  return label
}



// ----------------------
// EXPORT
// ----------------------

export default function Bar(gdkmonitor: Gdk.Monitor) {
  const time = createPoll("", 1000, "date")
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  return (
    <window
      visible
      name = "bar"
      class = "Bar"
      gdkmonitor = {gdkmonitor}
      exclusivity = {Astal.Exclusivity.EXCLUSIVE}
      anchor = {TOP | LEFT | RIGHT}
      application = {app}
    >
      <centerbox cssName="centerbox">
        <box $type="start" spacing="20" class="box rounded left-box">
          <SoundBars />
          <Workspaces />
        </box>

        <box $type="center" spacing="20" class="box rounded center-box">
          <Time />
          <Gif />
          <Date />
        </box>

        <box $type="end" spacing="20" class="box rounded right-box">
          <Volume />
          <Weather />
          <CpuTemperature />
          <NetworkSpeed />
        </box>

        </centerbox>
    </window>
  )
}

