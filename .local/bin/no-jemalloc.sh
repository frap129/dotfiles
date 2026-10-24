#!/bin/sh
set -eu

name=${0##*/}
self=$0
case $self in
*/*) ;;
*) self=$(command -v "$self" 2>/dev/null || printf '%s' "$self") ;;
esac
self=$(readlink -f -- "$self")

# Direct mode: no-jemalloc.sh command [args...]
if [ "$name" = "no-jemalloc.sh" ]; then
	if [ "$#" -eq 0 ]; then
		echo "usage: no-jemalloc.sh command [args...]" >&2
		exit 2
	fi
	exec env -u LD_PRELOAD -- "$@"
fi

target=
old_ifs=$IFS
IFS=:
for dir in $PATH; do
	[ -n "$dir" ] || dir=.
	candidate=$dir/$name
	[ -x "$candidate" ] || continue
	[ -d "$candidate" ] && continue

	# Skip any PATH entry that resolves to this script, including other symlinks.
	resolved=$(readlink -f -- "$candidate" 2>/dev/null || true)
	[ "$resolved" = "$self" ] && continue

	target=$candidate
	break
done
IFS=$old_ifs

if [ -z "$target" ]; then
	echo "no-jemalloc: '$name' not found in PATH" >&2
	exit 127
fi

exec env -u LD_PRELOAD -- "$target" "$@"
