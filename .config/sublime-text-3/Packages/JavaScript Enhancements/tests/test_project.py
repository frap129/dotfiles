import sublime
import time, os, shutil
from collections import OrderedDict
from unittesting import DeferrableTestCase
JavaScriptEnhancements = __import__('JavaScript Enhancements')
util = JavaScriptEnhancements.src.libs.util
PACKAGE_PATH = JavaScriptEnhancements.src.libs.global_vars.PACKAGE_PATH

project_path = os.path.join(os.path.expanduser("~"), "javascript_enhancements_project_test")
project_settings = {
  'project_file_name': os.path.join(project_path, 'javascript_enhancements_project_test.sublime-project'), 
  'settings_dir_name': os.path.join(project_path, '.je-project-settings'), 
  'project_settings': OrderedDict([('node_js_custom_path', ''), ('npm_custom_path', ''), ('yarn_custom_path', ''), ('use_yarn', False), ('build_flow', OrderedDict([('source_folders', []), ('destination_folder', ''), ('options', []), ('on_save', True)])), ('flow_checker_enabled', True), ('flow_cli_custom_path', ''), ('flow_remove_types_custom_path', ''), ('jsdoc', OrderedDict([('conf_file', '')]))]), 
  'project_dir_name': project_path, 
  'project_details': OrderedDict([('project_name', ''), ('author', ''), ('author_uri', ''), ('description', ''), ('version', ''), ('license', ''), ('license_uri', ''), ('tags', '')]), 
  'bookmarks': []
}

def plugin_ready():
  return os.path.exists(os.path.join(PACKAGE_PATH, "node_modules", ".bin"))

timeout = 30

class TestProject(DeferrableTestCase):

  def setUp(self):
    sublime.run_command('new_window')
    self.view = sublime.active_window().new_file()
    self.window = self.view.window()
    if os.path.isdir(project_path):
      shutil.rmtree(project_path)

  def tearDown(self):
    global project_path
    sublime.active_window().run_command("close")
    sublime.active_window().run_command("close")
    if os.path.isdir(project_path):
      shutil.rmtree(project_path)

  def test_project(self):
    start_time = time.time()

    while not plugin_ready():
      if time.time() - start_time <= timeout:
        yield 200
      else:
        raise TimeoutError("plugin is not ready in " + str(timeout) + " seconds")

    self.window.run_command("javascript_enhancements_create_new_project")
    yield 1000
    self.window.run_command("insert", {"characters": "empty"})
    yield 1000
    self.window.run_command("keypress", {"key": "enter"})
    yield 1000
    self.window.run_command("insert", {"characters": "javascript_enhancements_project_test"})
    yield 1000
    self.window.run_command("keypress", {"key": "enter"})
    self.window.run_command("keypress", {"key": "enter"})
    yield 1000
    self.assertDictEqual(project_settings, util.get_project_settings())
