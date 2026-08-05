return {
  "saghen/blink.cmp",
  dependencies = {
    "mikavilpas/blink-ripgrep.nvim",
    "bydlw98/blink-cmp-env",
    "ribru17/blink-cmp-spell",
  },
  opts = {
    keymap = {
      ["<C-g>"] = {
        function() require("blink.cmp").show { providers = { "ripgrep" } } end,
      },
    },
    sources = {
      default = { "lsp", "path", "buffer" },
      providers = {
        buffer = {
          opts = {
            get_bufnrs = function()
              return vim
                .iter(vim.fn.getbufinfo { buflisted = 1 })
                :filter(function(buf) return buf.loaded == 1 end)
                :map(function(buf) return buf.bufnr end)
                :totable()
            end,
          },
        },
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
          opts = {
            prefix_min_len = 5,
            backend = {
              ripgrep = {
                max_filesize = "256K",
                search_casing = "--smart-case",
                additional_rg_options = {
                  "--max-count=3",
                  "--glob=!build/**",
                  "--glob=!generated/**",
                  "--glob=!out/**",
                },
              },
            },
          },
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
