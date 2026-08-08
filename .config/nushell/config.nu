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

oh-my-posh init nu

use bash-env.nu
source ~/.zoxide.nu

def --env load-environment-d [] {
    ls ~/.config/environment.d/*.conf
    | sort-by name
    | each --flatten {|file|
        open --raw $file.name
        | lines
        | where {|line| ($line | str trim) != "" }
        | each {|line|
            if ($line | str trim | str starts-with "#") {
                $line
            } else {
                $"export ($line)"
            }
        }
    }
    | bash-env
    | load-env
}
load-environment-d
