#!/usr/bin/python

# This script requires i3ipc-python package (install it from a system package manager
# or pip).
# It adds icons to the workspace name for each open window.
# Set your keybindings like this: set $workspace1 workspace number 1
# Add your icons to WINDOW_ICONS.
# Based on https://github.com/swaywm/sway/blob/master/contrib/autoname-workspaces.py

import argparse
import i3ipc
import logging
import re
import signal
import sys

# To match an app_id, the key must be exact. To match a partial window name, the key
# must be contained somewhere in the name, case sensitive. For matching partial window
# names, the pairs higher in the list will take precidence over lower pairs.
WINDOW_ICONS = {
    "Mozilla Firefox": "",
    "Alacritty": "",
    "discord": "",
    "Steam": "",
    "vlc": "",
    "Transmission": "",
    "Bitwarden": "",
    "Google-chrome": "",
    "Chromium": "",
    "Slack": "",
    "code-oss": "",
    "Spotify": "",
    "GitHub Desktop": "",
    "firefox": "",
    "Nightly": "",
    "firefoxdeveloperedition": "",
    "npm": "",
    "node": "",
    "jetbrains-studio": "",
    "Discord": "ﭮ",
    "spt": "",
    "micro": "μ",
    "lutris": ""
}

DEFAULT_ICON = ""


def icon_for_window(window):
    id = None
    name = None
    if window.app_id is not None and len(window.app_id) > 0:
        id = window.app_id
    elif window.window_class is not None and len(window.window_class) > 0:
        id = window.window_class
    if window.name is not None and len(window.name) > 0:
        name =  window.name

    for key in WINDOW_ICONS.keys():
        if key in name:
            return WINDOW_ICONS[key]

    if id in WINDOW_ICONS:
        return WINDOW_ICONS[id]

    logging.info("No icon available for window with name: %s" % str(name))
    return DEFAULT_ICON

def rename_workspaces(ipc):
    for workspace in ipc.get_tree().workspaces():
        name_parts = parse_workspace_name(workspace.name)
        icon_tuple = ()
        for w in workspace:
            if w.app_id is not None or w.window_class is not None:
                icon = icon_for_window(w)
                if not ARGUMENTS.duplicates and icon in icon_tuple:
                    continue
                icon_tuple += (icon,)
        name_parts["icons"] = " ".join(icon_tuple) + " "
        new_name = construct_workspace_name(name_parts)
        ipc.command('rename workspace "%s" to "%s"' % (workspace.name, new_name))


def undo_window_renaming(ipc):
    for workspace in ipc.get_tree().workspaces():
        name_parts = parse_workspace_name(workspace.name)
        name_parts["icons"] = None
        new_name = construct_workspace_name(name_parts)
        ipc.command('rename workspace "%s" to "%s"' % (workspace.name, new_name))
    ipc.main_quit()
    sys.exit(0)


def parse_workspace_name(name):
    return re.match(
        "(?P<num>[0-9]+):?(?P<shortname>\w+)? ?(?P<icons>.+)?", name
    ).groupdict()


def construct_workspace_name(parts):
    new_name = str(parts["num"])
    name = parts["shortname"]
    icons = parts["icons"]
    if name is not None and name.strip() or icons is not None and icons.strip():
        new_name += ":"

        if parts["shortname"]:
            new_name += parts["shortname"]

        if parts["icons"]:
            new_name += " " + parts["icons"].strip()

    return new_name


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="This script automatically changes the workspace name in sway depending on your open applications."
    )
    parser.add_argument(
        "--duplicates",
        "-d",
        action="store_true",
        help="Set it when you want an icon for each instance of the same application per workspace.",
    )
    parser.add_argument(
        "--logfile",
        "-l",
        type=str,
        default="/tmp/sway-autoname-workspaces.log",
        help="Path for the logfile.",
    )
    args = parser.parse_args()
    global ARGUMENTS
    ARGUMENTS = args

    logging.basicConfig(
        level=logging.INFO,
        filename=ARGUMENTS.logfile,
        filemode="w",
        format="%(message)s",
    )

    ipc = i3ipc.Connection()

    for sig in [signal.SIGINT, signal.SIGTERM]:
        signal.signal(sig, lambda signal, frame: undo_window_renaming(ipc))

    def window_event_handler(ipc, e):
        if e.change in ["new", "close", "move", "title"]:
            rename_workspaces(ipc)

    ipc.on("window", window_event_handler)

    rename_workspaces(ipc)

    ipc.main()

