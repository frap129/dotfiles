---@type LazySpec
return {
  {
    "nvim-neo-tree/neo-tree.nvim",
    config = function(plugin, opts)
      require("neo-tree").setup {
        filesystem = {
          filtered_items = {
            visible = true,
            hide_dotfiles = false,
            hide_gitignored = false,
          },
        },
      }
    end,
  },
  {
    "akinsho/toggleterm.nvim",
    config = function(plugin, opts)
      require("toggleterm").setup {
        direction = "horizontal",
        shade_terminals = true,
        shading_factor = -15,
        size = 20,
      }
    end,
  },
}
