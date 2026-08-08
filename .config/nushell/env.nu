# env.nu
#
# Installed by:
# version = "0.114.1"
#
# Previously, environment variables were typically configured in `env.nu`.
# In general, most configuration can and should be performed in `config.nu`
# or one of the autoload directories.
#
# This file is generated for backwards compatibility for now.
# It is loaded before config.nu and login.nu
#
# See https://www.nushell.sh/book/configuration.html
#
# Also see `help config env` for more options.
#
# You can remove these comments if you want or leave
# them for future reference.
mkdir $"($nu.cache-dir)"

use load-environment-d.nu
load-environment-d

# Integratons
carapace _carapace nushell | save -f $"($nu.cache-dir)/carapace.nu"
zoxide init nushell --cmd cd | save -f $"($nu.cache-dir)/zoxide.nu"
atuin init nu | save -f $"($nu.cache-dir)/atuin.nu"
tirith init --shell nushell | save -f $"($nu.cache-dir)/tirith.nu"
