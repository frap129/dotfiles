return {
  "Saghen/blink.cmp",
  optional = true,
  dependencies = {
    "mikavilpas/blink-ripgrep.nvim",
    "bydlw98/blink-cmp-env",
    "ribru17/blink-cmp-spell",
    "disrupted/blink-cmp-conventional-commits",
  },
  opts = {
    sources = {
      default = { "lsp", "path", "snippets", "buffer", "spell", "env", "ripgrep", "conventional_commits" },
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
          name = "Env",
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
          ---@module "blink-ripgrep"
          ---@type blink-ripgrep.Options
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
      conventional_commits = {
        name = "Conventional Commits",
        module = "blink-cmp-conventional-commits",
        enabled = function() return vim.bo.filetype == "gitcommit" end,
        ---@module 'blink-cmp-conventional-commits'
        ---@type blink-cmp-conventional-commits.Options
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
