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

// ----------------------
// LEFT
// ----------------------


function W_SoundBars() {
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

function W_Workspaces() {
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

function W_Time() {
  return (
    <label
      label={createPoll("", 1000, TIME_FORMAT)}
      class="time"
    />
  )
}

function W_Gif() {
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

function W_Date() {
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

function W_Volume() {
  const audio = Wp.get_default()
  const speaker = audio.default_speaker

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

  const update = () => {
    const vol = speaker.volume
    label.label = `${getVolumeIcon(vol)} ${Math.round(vol * 100)}%`
  }

  update()
  speaker.connect("notify::volume", update)
  speaker.connect("notify::mute", update)

  return label
}

function W_Weather() {
  const weather = createPoll("", 60000, `curl -s "wttr.in/London?format=j1"`)

  const getIcon = (code: number) => {
    if (code === 113) return "󰖙" // sunny
    if (code === 116) return "󰖕" // partly cloudy
    if (code === 119 || code === 122) return "󰖐" // cloudy
    if (code === 143 || code === 248 || code === 260) return "󰖑" // fog
    if ([176, 293, 296, 299, 302, 305, 308].includes(code)) return "󰖗" // rain
    if ([179, 323, 326, 329, 332, 335, 338].includes(code)) return "󰖘" // snow
    if ([200, 386, 389, 392, 395].includes(code)) return "󰖓" // thunder
    return "󰖐" // default cloudy
  }

  return (
    <label
      class="weather"
      label={weather.as(out => {
        if (!out) return "…"

        try {
          const data = JSON.parse(out)
          const current = data.current_condition?.[0]

          if (!current) return "N/A"

          const temp = current.temp_C
          const code = Number(current.weatherCode)

          return `${getIcon(code)} ${temp}°C`
        } catch {
          return "ERR"
        }
      })}
    />
  )
}

function W_Temperature() {
  const temp = createPoll("", 100, "bash -c 'awk \"{printf \\\"%.1f\\\", \\$1/1000}\" $(grep -rl Tctl /sys/class/hwmon/hwmon*/temp*_label | sed s/temp.*_label/temp1_input/)'")
  
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

function W_Network() {
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
  }, 100)

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
          <W_SoundBars />
          <W_Workspaces />
        </box>

        <box $type="center" spacing="20" class="box rounded center-box">
          <W_Time />
          <W_Gif />
          <W_Date />
        </box>

        <box $type="end" spacing="20" class="box rounded right-box">
          <W_Volume />
          <W_Weather />
          <W_Temperature />
          <W_Network />
        </box>

        </centerbox>
    </window>
  )
}

