-- User plugins

---@type LazySpec
return {
  {
    "ray-x/lsp_signature.nvim",
    event = "LspAttach",
    opts = {
      bind = true,
      handler_opts = {
        border = "rounded",
      },
    },
  },
  {
    "nvim-neo-tree/neo-tree.nvim",
    opts = {
      filesystem = {
        filtered_items = {
          visible = true,
          hide_dotfiles = false,
          hide_gitignored = false,
        },
      },
    },
  },
  {
    "akinsho/toggleterm.nvim",
    opts = {
      direction = "float",
    },
  },
  {
    "linux-cultist/venv-selector.nvim",
    dependencies = { "neovim/nvim-lspconfig", "nvim-telescope/telescope.nvim", "mfussenegger/nvim-dap-python" },
    opts = {},
    event = "VeryLazy",
    keys = {
      { "<leader>vs", "<cmd>VenvSelect<cr>" },
      { "<leader>vc", "<cmd>VenvSelectCached<cr>" },
    },
  },
  {
    "folke/snacks.nvim",
    opts = {
      animate = {
        enabled = true,
      },
      bigfile = {
        enabled = true,
      },
      image = {
        enabled = false,
      },
      input = {
        enabled = true,
      },
      quickfile = {
        enabled = true,
      },
      words = {
        enabled = true,
      },
    },
  },
  {
    "Bekaboo/dropbar.nvim",
    dependencies = {
      "nvim-telescope/telescope-fzf-native.nvim",
      build = "make",
    },
    event = "UIEnter",
    opts = {},
    specs = {
      {
        "rebelot/heirline.nvim",
        optional = true,
        opts = function(_, opts) opts.winbar = nil end,
      },
    },
  },
  {
    "ariedov/android-nvim",
    config = function() require("android-nvim").setup() end,
  },
  {
    "NickvanDyke/opencode.nvim",
    init = function()
      ---@diagnostic disable-next-line: inject-field
      vim.g.opencode_opts = {}
      vim.o.autoread = true
    end,
    keys = {
      { "<leader>zg", function() require("opencode").toggle() end, desc = "Toggle opencode", mode = { "n", "t" } },
      {
        "<leader>zi",
        function() require("opencode").ask("", { submit = false }) end,
        desc = "Open opencode input",
        mode = { "n", "x" },
      },
      {
        "<leader>zI",
        function()
          require("opencode").command "session.new"
          require("opencode").ask("", { submit = false })
        end,
        desc = "Open opencode input (new session)",
        mode = { "n", "x" },
      },
      { "<leader>zo", function() require("opencode").toggle() end, desc = "Open opencode output", mode = "n" },
      { "<leader>zt", function() require("opencode").toggle() end, desc = "Toggle focus", mode = "n" },
      {
        "<leader>zq",
        function() require("opencode").command "session.close" end,
        desc = "Close opencode",
        mode = "n",
      },
      { "<leader>zs", function() require("opencode").select() end, desc = "Select opencode session", mode = "n" },
    },
  },
  {
    "https://github.com/fresh2dev/zellij.vim",
    lazy = false,
    init = function() end,
  },
}
