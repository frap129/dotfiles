import sublime, sublime_plugin
import os, shlex, json, collections, traceback
from ....libs.global_vars import *
from ....libs import util
from ....libs import JavascriptEnhancementsExecuteOnTerminalCommand
from ....libs import Terminal
from ....libs import Hook

class JavascriptEnhancementsAngularv1CliCommand(JavascriptEnhancementsExecuteOnTerminalCommand, sublime_plugin.WindowCommand):

  cli = "yo"
  custom_name = "angularv1"
  settings_name = "angularv1_settings"

  def prepare_command(self, **kwargs):

    if ":name" in self.command:
      sublime.active_window().show_input_panel( (self.command[0].replace("angular:", ""))+" name:", "", self.name_on_done, None, None )
    else :
      self._run()

  def name_on_done(self, name):
    self.placeholders[":name"] = shlex.quote(name.strip())
    self.command = self.substitute_placeholders(self.command)
    self._run()

  def _run(self):
    # try:
    #   self.command = {
    #     'serve': lambda : self.command + self.settings["angularv1_settings"]
    #   }[self.command[0]]()
    # except KeyError as err:
    #   pass
    # except Exception as err:
    #   print(traceback.format_exc())
    #   pass

    super(JavascriptEnhancementsAngularv1CliCommand, self)._run()



def angularv1_ask_custom_path(project_path, type):
    sublime.active_window().show_input_panel("Yeoman CLI custom path", "yo", lambda angularv1_custom_path: angularv1_prepare_project(project_path, angularv1_custom_path) if type == "create_new_project" or type == "add_project_type" else add_angularv1_settings(project_path, angularv1_custom_path), None, None)

def add_angularv1_settings(working_directory, angularv1_custom_path):
  project_path = working_directory
  settings = util.get_project_settings()
  if settings :
    project_path = settings["project_dir_name"]
    
  # flowconfig_file_path = os.path.join(project_path, ".flowconfig")
  # with open(flowconfig_file_path, 'r+', encoding="utf-8") as file:
  #   content = file.read()
  #   content = content.replace("[ignore]", """[ignore]""")
  #   file.seek(0)
  #   file.truncate()
  #   file.write(content)

  PROJECT_SETTINGS_FOLDER_PATH = os.path.join(project_path, PROJECT_SETTINGS_FOLDER_NAME)

  default_config = json.loads(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "default_config.json")).read(), object_pairs_hook=collections.OrderedDict)
  default_config["working_directory"] = working_directory
  default_config["cli_custom_path"] = angularv1_custom_path

  angularv1_settings = os.path.join(PROJECT_SETTINGS_FOLDER_PATH, "angularv1_settings.json")

  with open(angularv1_settings, 'w+', encoding="utf-8") as file:
    file.write(json.dumps(default_config, indent=2))

def angularv1_prepare_project(project_path, angularv1_custom_path):
  
  terminal = Terminal(cwd=project_path)
  
  if sublime.platform() != "windows": 
    open_project = ["&&", shlex.quote(util.sublime_executable_path()), shlex.quote(util.get_project_settings(project_path)["project_file_name"])] if not util.is_project_open(util.get_project_settings(project_path)["project_file_name"]) else []
    terminal.run([shlex.quote(angularv1_custom_path), "angular"] + open_project)
  else:
    open_project = [util.sublime_executable_path(), util.get_project_settings(project_path)["project_file_name"], "&&", "exit"] if not util.is_project_open(util.get_project_settings(project_path)["project_file_name"]) else []
    terminal.run([angularv1_custom_path, "angular"])
    if open_project:
      terminal.run(open_project)

  add_angularv1_settings(project_path, angularv1_custom_path)

Hook.add("angularv1_after_create_new_project", angularv1_ask_custom_path)
Hook.add("angularv1_add_javascript_project_configuration", angularv1_ask_custom_path)
Hook.add("angularv1_add_javascript_project_type", angularv1_ask_custom_path)
