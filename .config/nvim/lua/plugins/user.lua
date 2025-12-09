-- You can also add or configure plugins by creating files in this `plugins/` folder
-- PLEASE REMOVE THE EXAMPLES YOU HAVE NO INTEREST IN BEFORE ENABLING THIS FILE
-- Here are some examples:

---@type LazySpec
return {
  {
    "ray-x/lsp_signature.nvim",
    event = "InsertEnter",
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
    opts = {
      -- Your options go here
      -- name = "venv",
      -- auto_refresh = false
    },
    event = "VeryLazy", -- Optional: needed only if you want to type `:VenvSelect` without a keymapping
    keys = {
      -- Keymap to open VenvSelector to pick a venv.
      { "<leader>vs", "<cmd>VenvSelect<cr>" },
      -- Keymap to retrieve the venv from a cache (the one previously used for the same project directory).
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
    "sudo-tee/opencode.nvim",
    config = function()
      require("opencode").setup {
        keymap = {
          global = {
            toggle = "<leader>ag", -- Open opencode. Close if opened
            open_input = "<leader>ai", -- Opens and focuses on input window on insert mode
            open_input_new_session = "<leader>aI", -- Opens and focuses on input window on insert mode. Creates a new session
            open_output = "<leader>ao", -- Opens and focuses on output window
            toggle_focus = "<leader>at", -- Toggle focus between opencode and last window
            close = "<leader>aq", -- Close UI windows
            select_session = "<leader>as", -- Select and load a opencode session
            configure_provider = "<leader>ap", -- Quick provider and model switch from predefined list
            diff_open = "<leader>ad", -- Opens a diff tab of a modified file since the last opencode prompt
            diff_next = "<leader>a]", -- Navigate to next file diff
            diff_prev = "<leader>a[", -- Navigate to previous file diff
            diff_close = "<leader>ac", -- Close diff view tab and return to normal editing
            diff_revert_all_last_prompt = "<leader>ara", -- Revert all file changes since the last opencode prompt
            diff_revert_this_last_prompt = "<leader>art", -- Revert current file changes since the last opencode prompt
            diff_revert_all = "<leader>arA", -- Revert all file changes since the last opencode session
            diff_revert_this = "<leader>arT", -- Revert current file changes since the last opencode session
            swap_position = "<leader>ax", -- Swap Opencode pane left/right
          },
        },
      }
    end,
    dependencies = {
      "nvim-lua/plenary.nvim",
      {
        "MeanderingProgrammer/render-markdown.nvim",
        opts = {
          anti_conceal = { enabled = false },
          file_types = { "markdown", "opencode_output" },
        },
        ft = { "markdown", "Avante", "copilot-chat", "opencode_output" },
      },
    },
  },
  {
    "https://github.com/fresh2dev/zellij.vim",
    -- Pin version to avoid breaking changes.
    -- tag = '0.3.*',
    lazy = false,
    init = function()
      -- Options:
      -- vim.g.zelli_navigator_move_focus_or_tab = 1
      -- vim.g.zellij_navigator_no_default_mappings = 1
    end,
  },
}
