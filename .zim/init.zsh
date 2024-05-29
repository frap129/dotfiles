zimfw() { source /home/joe/.zim/zimfw.zsh "${@}" }
zmodule() { source /home/joe/.zim/zimfw.zsh "${@}" }
fpath=(/home/joe/.zim/modules/git/functions /home/joe/.zim/modules/utility/functions /home/joe/.zim/modules/zsh-completions/src ${fpath})
autoload -Uz -- git-alias-lookup git-branch-current git-branch-delete-interactive git-branch-remote-tracking git-dir git-ignore-add git-root git-stash-clear-interactive git-stash-recover git-submodule-move git-submodule-remove mkcd mkpw
source /home/joe/.zim/modules/environment/init.zsh
source /home/joe/.zim/modules/git/init.zsh
source /home/joe/.zim/modules/input/init.zsh
source /home/joe/.zim/modules/termtitle/init.zsh
source /home/joe/.zim/modules/utility/init.zsh
source /home/joe/.zim/modules/powerlevel10k/powerlevel10k.zsh-theme
source /home/joe/.zim/modules/completion/init.zsh
source /home/joe/.zim/modules/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
source /home/joe/.zim/modules/zsh-history-substring-search/zsh-history-substring-search.zsh
source /home/joe/.zim/modules/zsh-autosuggestions/zsh-autosuggestions.zsh
