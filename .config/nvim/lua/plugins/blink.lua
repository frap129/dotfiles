return {
  "moyiz/blink-emoji.nvim",
  lazy = true,
  specs = {
    {
      "Saghen/blink.cmp",
      optional = true,
      opts = {
        sources = {
          default = { "lsp", "path", "snippets", "buffer", "spell", "env", "ripgrep" },
          providers = {
            spell = {
              name = "Spell",
              module = "blink-cmp-spell",
              opts = {
                -- EXAMPLE: Only enable source in `@spell` captures, and disable it
                -- in `@nospell` captures.
                enable_in_context = function()
                  local curpos = vim.api.nvim_win_get_cursor(0)
                  local captures = vim.treesitter.get_captures_at_pos(0, curpos[1] - 1, curpos[2] - 1)
                  local in_spell_capture = false
                  for _, cap in ipairs(captures) do
                    if cap.capture == "spell" then
                      in_spell_capture = true
                    elseif cap.capture == "nospell" then
                      return false
                    end
                  end
                  return in_spell_capture
                end,
              },
            },
            env = {
              name = "Env",
              module = "blink-cmp-env",
              opts = {
                show_braces = false,
                show_documentation_window = true,
              },
            },
            ripgrep = {
              module = "blink-cmp-rg",
              name = "Ripgrep",
              -- options below are optional, these are the default values
              ---@type blink-cmp-rg.Options
              opts = {
                -- `min_keyword_length` only determines whether to show completion items in the menu,
                -- not whether to trigger a search. And we only has one chance to search.
                prefix_min_len = 3,
                get_command = function(context, prefix)
                  return {
                    "rg",
                    "--no-config",
                    "--json",
                    "--word-regexp",
                    "--ignore-case",
                    "--",
                    prefix .. "[\\w_-]+",
                    vim.fs.root(0, ".git") or vim.fn.getcwd(),
                  }
                end,
                get_prefix = function(context) return context.line:sub(1, context.cursor[2]):match "[%w_-]+$" or "" end,
              },
            },
          },
        },
        fuzzy = {
          sorts = {
            function(a, b)
              local sort = require "blink.cmp.fuzzy.sort"
              if a.source_id == "spell" and b.source_id == "spell" then return sort.label(a, b) end
            end,
            -- This is the normal default order, which we fall back to
            "score",
            "kind",
            "label",
          },
        },
      },
    },
  },
}
