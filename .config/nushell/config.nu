# config.nu
#
# Installed by:
# version = "0.114.1"
#
# This file is used to override default Nushell settings, define
# (or import) custom commands, or run any other startup tasks.
# See https://www.nushell.sh/book/configuration.html
#
# Nushell sets "sensible defaults" for most configuration settings, 
# so your `config.nu` only needs to override these defaults if desired.
#
# You can open this file in your default editor using:
#     config nu
#
# You can also pretty-print and page through the documentation for configuration
# options using:
#     config nu --doc | nu-highlight | less -R

$env.config.show_banner = false
$env.config.use_kitty_protocol = true
$env.config.keybindings ++= [
  {
    name: delete_word_before
    modifier: control
    keycode: backspace
    mode: [emacs, vi_insert]
    event: { edit: backspaceword }
  }
]

source ~/.config/shell/aliases.nu

source $"($nu.cache-dir)/carapace.nu"
source $"($nu.cache-dir)/zoxide.nu"
source $"($nu.cache-dir)/atuin.nu"
oh-my-posh init nu --config ~/.config/oh-my-posh.json
