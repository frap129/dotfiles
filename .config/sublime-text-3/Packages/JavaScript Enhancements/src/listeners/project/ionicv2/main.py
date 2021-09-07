import sublime, sublime_plugin
import os
from ... import JavascriptEnhancementsEnableProjectTypeMenuEventListener

class JavascriptEnhancementsEnableIonicv2MenuEventListener(JavascriptEnhancementsEnableProjectTypeMenuEventListener, sublime_plugin.EventListener):
  project_type = "ionicv2"
  path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Main.sublime-menu")
  path_disabled = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Main_disabled.sublime-menu")