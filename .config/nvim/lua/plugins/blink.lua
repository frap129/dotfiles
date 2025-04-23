return {
  "Saghen/blink.cmp",
  dependencies = {
    "mikavilpas/blink-ripgrep.nvim",
    "bydlw98/blink-cmp-env",
    "ribru17/blink-cmp-spell",
  },
  opts = {
    sources = {
      default = { "lsp", "path", "snippets", "buffer", "env", "ripgrep", "omni", "dap", "cmdline" },
      providers = {
        spell = {
          name = "Spell",
          module = "blink-cmp-spell",
          transform_items = function(_, items)
            for _, item in ipairs(items) do
              item.labelDetails = {
                description = "(spell)",
              }
            end
            return items
          end,
        },
        env = {
          name = "env",
          module = "blink-cmp-env",
          opts = {
            show_braces = false,
            show_documentation_window = true,
          },
          transform_items = function(_, items)
            for _, item in ipairs(items) do
              item.labelDetails = {
                description = "(env)",
              }
            end
            return items
          end,
        },
        ripgrep = {
          module = "blink-ripgrep",
          name = "Ripgrep",
          transform_items = function(_, items)
            for _, item in ipairs(items) do
              item.labelDetails = {
                description = "(rg)",
              }
            end
            return items
          end,
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
}
