import sublime, sublime_plugin
import os
from ..libs import NodeJS
from ..libs import util
from ..libs import FlowCLI

class JavascriptEnhancementsSortImportsCommand(sublime_plugin.TextCommand):

  def run(self, edit, **args):
    view = self.view

    if "imports" in args and "region_points" in args:
      imports = args.get('imports')
      region_points = args.get('region_points')
      first_line = view.substr(view.full_line(0)).strip()
      first_line_empty = True if not first_line or not first_line.startswith("import") else False
      if region_points:
        for i in range(1, len(region_points)+1):
          regionPoint = region_points[-i]
          region = sublime.Region(regionPoint[0], regionPoint[1])
          full_line = view.substr(view.full_line(region)).replace(view.substr(region), '').strip()
          if not full_line:
            region = sublime.Region(regionPoint[0]-1, regionPoint[1])
          view.erase(edit, region)

        if view.match_selector(0, 'comment'):
          comment = view.extract_scope(0)
          view.replace(edit, sublime.Region(comment.end(), comment.end()), "\n" + "\n".join(sorted(imports)))
        elif first_line_empty:
          view.replace(edit, sublime.Region(0,0), "\n".join(sorted(imports)) + "\n\n")
        else:
          view.replace(edit, sublime.Region(0,0), "\n".join(sorted(imports)))

    else:
      sublime.set_timeout_async(self.get_ast_imports)

  def get_ast_imports(self):

    view = self.view

    flow_cli = FlowCLI(view)
    result = flow_cli.ast()

    if result[0]:
      if "body" in result[1]:
        body = result[1]["body"]
        items = util.nested_lookup("type", ["ImportDeclaration"], body)
        imports = []
        region_points = []
        for item in items:
          row = int(item['loc']['start']['line']) - 1
          endrow = int(item['loc']['end']['line']) - 1
          col = int(item['loc']['start']['column']) - 1
          endcol = int(item['loc']['end']['column'])

          start_region = view.text_point(row, col)
          end_region = view.text_point(endrow, endcol)
          region_points += [[start_region, end_region]]

          importRegion = sublime.Region(start_region, end_region) 

          imports += [view.substr(importRegion)]

        view.run_command('javascript_enhancements_sort_imports', args={"imports": imports, "region_points": region_points})
  
  def is_enabled(self):
    view = self.view
    if not util.selection_in_js_scope(view) and view.find_by_selector('source.js.embedded.html'):
      return False

    if view.find_by_selector('meta.import.js'):
      return True

    # try JavaScript (Babel) syntax
    import_regions = view.find_by_selector('keyword.operator.module.js')
    for import_region in import_regions:
      if (view.substr(import_region).startswith("import")) :
        return True

    return False

  def is_visible(self):
    view = self.view
    if not util.selection_in_js_scope(view) and view.find_by_selector('source.js.embedded.html'):
      return False

    if view.find_by_selector('meta.import.js'):
      return True

    # try JavaScript (Babel) syntax
    import_regions = view.find_by_selector('keyword.operator.module.js')
    for import_region in import_regions:
      if (view.substr(import_region).startswith("import")) :
        return True

    return False
