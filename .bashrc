#
# ~/.bashrc
#

# If not running interactively, don't do anything
[[ $- != *i* ]] && return

alias ls='ls --color=auto'
alias grep='grep --color=auto'
PS1='[\u@\h \W]\$ '

# aliases
alias matrix="unimatrix -s 93"
alias clock="tty-clock -tcC 3"
alias ff="fastfetch"

# vsc os keychain fix
alias code="code --password-store=basic"

# paste highlight fix
bind 'set enable-bracketed-paste off'

# starship startup
eval "$(starship init bash)"
