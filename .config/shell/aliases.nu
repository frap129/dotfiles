alias adate = sh "-c" "adb shell date $(date +%m%d%H%M%Y.%S)"
alias ag = ug "-r" "--ignore-files" "-I" "-n" "--heading" "--break" "--color" "-j" "--sort"
alias bunx = aubx
alias cat = bat "-pp"
alias diff = delta
alias du = dust
alias egrep = ugrep "-E"
alias fhere = find "." "-name"
alias grep = ugrep "-G"
def --wrapped myip [...rest] {
  curl "http://ipecho.net/plain" ; echo ...$rest
}
alias rg = ugrep "-r" "--ignore-files" "--ignore-files=.ignore" "--ignore-files=.rgignore" "-I" "-n" "--heading" "--break" "--color"
alias vi = nvim
alias vim = nvim
