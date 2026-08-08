# Import environment from .config/environment.d
set -a
for file in "$HOME"/.config/environment.d/*.conf; do
  [ -r "$file" ] || continue
  . "$file"
done
unset file
set +a

# Spawn nushell
if [[ $- == *i* ]] && [[ $(command -v nu) ]]; then
  exec nu -il
fi
