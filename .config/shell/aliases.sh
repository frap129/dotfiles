alias adate='sh -c '"'"'adb shell date $(date +%m%d%H%M%Y.%S)'"'"''
alias ag='ug -r --ignore-files -I -n --heading --break --color -j --sort'
alias cat='bat -pp'
if command -v delta >/dev/null 2>&1; then
  alias diff=delta
fi
alias du=dust
alias fhere='find . -name'
alias grep=ugrep
alias histg='history | grep'
alias ls='eza -hg --icons --group-directories-first'
alias myip='curl http://ipecho.net/plain ; echo'
alias rg='ugrep -r --ignore-files --ignore-files=.ignore --ignore-files=.rgignore -I -n --heading --break --color'
alias vi=nvim
alias vim=nvim
