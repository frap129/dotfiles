import sublime, sublime_plugin
from ..libs import util

class JavascriptEnhancementsStringLinesToConcatCommand(sublime_plugin.TextCommand):
  def run(self, edit, **args):
    view = self.view
    selections = view.sel()
    for selection in selections :
      scope = view.scope_name(selection.begin()).strip()
      scope_splitted = scope.split(" ")
      case = args.get("case")
      if case == "split" :
        result = util.first_index_of_multiple(scope_splitted, ("string.quoted.double.js", "string.quoted.single.js", "string.template.js", "string.quoted.js", "string.interpolated.js"))
        scope_string = scope_splitted[result.get("index")]
        selector = result.get("string")
        item = util.get_region_scope_first_match(view, scope, selection, selector)
        if item :
          lines = item.get("region_string_stripped")[1:-1].split("\n")
          str_splitted = list()
          str_splitted.append("let str = \"\"")
          for line in lines :
            line = line if scope_string == "string.template.js" else line.strip()[0:-1]
            line = line.strip()
            if line :
              str_splitted.append( "str += "+"%r"%line )
          str_splitted = "\n".join(str_splitted)
          str_splitted = util.add_whitespace_indentation(view, selection, str_splitted, "\n")
          view.replace(edit, item.get("region"), str_splitted)
          
  def is_visible(self, **args) :
    view = self.view
    if util.split_string_and_find(view.scope_name(0), "source.js") < 0 :
      return False
    selection = view.sel()[0]
    scope = view.scope_name(selection.begin()).strip()
    scope_splitted = scope.split(" ")
    result = util.first_index_of_multiple(scope_splitted, ("string.quoted.double.js", "string.quoted.single.js", "string.template.js", "string.quoted.js", "string.interpolated.js"))
    if result.get("index") < 0 :
      return False
    return True
