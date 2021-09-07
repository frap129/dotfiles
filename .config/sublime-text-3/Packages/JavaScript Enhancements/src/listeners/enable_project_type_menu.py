import sublime, sublime_plugin
import os
from ..libs import util

class JavascriptEnhancementsEnableProjectTypeMenuEventListener():
  project_type = ""
  path = ""
  path_disabled = ""

  def on_activated(self, view):
    if self.project_type and self.path and self.path_disabled:
      if util.is_type_javascript_project(self.project_type) :
        if os.path.isfile(self.path_disabled):
          os.rename(self.path_disabled, self.path)
      else :
        if os.path.isfile(self.path):
          os.rename(self.path, self.path_disabled)
    elif self.path and self.path_disabled:
      if util.is_javascript_project() :
        if os.path.isfile(self.path_disabled):
          os.rename(self.path_disabled, self.path)
      else :
        if os.path.isfile(self.path):
          os.rename(self.path, self.path_disabled)

  def on_new(self, view):
    self.on_activated(view)

  def on_load(self, view):
    self.on_activated(view)
