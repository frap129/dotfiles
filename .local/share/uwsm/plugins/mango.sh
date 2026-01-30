#!/bin/false
# sourced by uwsm environment preloader

quirks_mango() {
  # append "wlroots" to XDG_CURRENT_DESKTOP if not already there
  # this is required for xdg-desktop-portal-wlr compatibility
  if [ "${__WM_DESKTOP_NAMES_EXCLUSIVE__}" != "true" ]; then
    case "A:${XDG_CURRENT_DESKTOP}:Z" in
    *:wlroots:*) true ;;
    *)
      export XDG_CURRENT_DESKTOP="${XDG_CURRENT_DESKTOP}:wlroots"
      ;;
    esac
  fi

  # Xwayland is enabled by default in mangowc
  XWAYLAND=true

  # mark additional vars for export on finalize
  UWSM_FINALIZE_VARNAMES="${UWSM_FINALIZE_VARNAMES}${UWSM_FINALIZE_VARNAMES:+ }XCURSOR_SIZE XCURSOR_THEME"
  export UWSM_FINALIZE_VARNAMES
}
