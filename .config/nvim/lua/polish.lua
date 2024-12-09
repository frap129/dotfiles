-- This will run last in the setup process and is a good place to configure
-- things like custom filetypes. This is just pure lua so anything that doesn't
-- fit in the normal config locations above can go here

-- Tabs -> Spaces
vim.opt_global.expandtab = true

-- Sudo write
vim.api.nvim_create_user_command("SudoWrite", function() vim.cmd "w !sudo tee % > /dev/null" end, {})
