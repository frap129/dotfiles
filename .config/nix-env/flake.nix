{
  description = "Portable CLI/TUI environment with shell tools";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };

        # Cargo installed tools
        cargoTools = with pkgs; [
          ripgrep        # rg - fast grep
          just           # command runner
          cargo-cache    # cargo cache management
          cargo-tarpaulin # code coverage
          cargo-update   # cargo install-update
          cargo-watch    # file watcher for cargo
          tokei          # code statistics
          hyperfine      # benchmarking tool
        ];

        # Python tools
        pythonTools = with pkgs; [
          uv             # fast Python package installer
          python312      # Python 3.12
          python312Packages.python-lsp-server
          python312Packages.ipython
          ruff           # fast Python linter
        ];

        # Node tools
        nodeTools = with pkgs; [
          nodePackages.typescript
          nodePackages.prettier
        ];

        # Core shell environment
        shellTools = with pkgs; [
          zsh
          bash
          bashInteractive
          bash-completion
          
          # Zsh plugins/themes (alternatives to zim)
          zsh-autosuggestions
          zsh-syntax-highlighting
          zsh-history-substring-search
          zsh-powerlevel10k
        ];

        # Modern CLI replacements
        modernCLI = with pkgs; [
          bat            # cat replacement
          eza            # ls replacement
          delta          # diff viewer
          zoxide         # cd replacement
          dust           # du replacement
          fd             # find replacement
          tealdeer       # tldr pages
          procs          # ps replacement
        ];

        # Search and text tools
        searchTools = with pkgs; [
          ugrep          # fast grep
          fzf            # fuzzy finder
          jq             # JSON processor
          yq-go          # YAML processor
        ];

        # System monitoring
        monitoringTools = with pkgs; [
          btop           # resource monitor
          fastfetch      # system info
          htop           # process viewer
        ];

        # Development tools
        devTools = with pkgs; [
          neovim
          git
          git-lfs
          curl
          wget
          openssh
          sshfs
          less
          which
          unzip
          zip
          pigz           # parallel gzip
          
          # Build tools
          clang
          lld
          gnumake
          cmake
          pkg-config
          
          # Language tools
          nodejs
          go
          rustup         # Rust toolchain manager
        ];

        # Container and virtualization
        containerTools = with pkgs; [
          podman
          distrobox
        ];

        # File management
        fileTools = with pkgs; [
          ranger         # TUI file manager
          yadm           # dotfile manager
          syncthing      # file sync
          gvfs           # virtual filesystems
        ];

        # Network tools
        networkTools = with pkgs; [
          tailscale      # VPN/mesh network
          iw             # wireless tools
          dnsmasq        # DNS/DHCP
        ];

        # Password/secrets management
        secretsTools = with pkgs; [
          rbw            # Bitwarden CLI
        ];

        # System utilities
        systemTools = with pkgs; [
          lsof
          brightnessctl  # screen brightness
          topgrade       # universal updater
          btrfs-progs    # BTRFS tools
        ];

        # Wayland/Hyprland desktop tools
        waylandTools = with pkgs; [
          hyprland
          hyprpaper
          hypridle
          hyprlock
          hyprcursor
          hyprpicker
          waybar
          wofi
          alacritty      # terminal
          wl-clipboard   # clipboard utilities
          clipman        # clipboard manager
          wdisplays      # display configuration
          wlsunset       # screen temperature
          grim           # screenshots
          slurp          # screen area selector
          wlr-randr      # display configuration
          xdg-desktop-portal-hyprland
          xdg-desktop-portal-gtk
          xwayland
        ];

        # Fonts
        fonts = with pkgs; [
          nerd-fonts.fira-code
          noto-fonts-color-emoji
        ];

        # All packages combined
        allPackages = shellTools 
          ++ modernCLI 
          ++ searchTools 
          ++ monitoringTools 
          ++ devTools 
          ++ cargoTools
          ++ pythonTools
          ++ nodeTools
          ++ containerTools 
          ++ fileTools 
          ++ networkTools 
          ++ secretsTools
          ++ systemTools
          ++ waylandTools
          ++ fonts;

      in
      {
        # Development shell with all tools
        devShells.default = pkgs.mkShell {
          buildInputs = allPackages;
          
          shellHook = ''
            # Source common shell config if it exists
            if [ -f ~/.commonrc ]; then
              source ~/.commonrc
            fi
            
            # Setup zsh as default if available and not already in zsh
            if command -v zsh &> /dev/null && [ -z "$ZSH_VERSION" ]; then
              exec "$(command -v zsh)" -l
            fi
          '';
        };

        # Separate shells for specific use cases
        devShells.minimal = pkgs.mkShell {
          buildInputs = shellTools ++ modernCLI ++ searchTools ++ [
            pkgs.neovim
            pkgs.git
          ];

          shellHook = ''
            if [ -f ~/.commonrc ]; then
              source ~/.commonrc
            fi
            if command -v zsh &> /dev/null && [ -z "$ZSH_VERSION" ]; then
              exec "$(command -v zsh)" -l
            fi
          '';
        };

        devShells.dev = pkgs.mkShell {
          buildInputs = shellTools ++ modernCLI ++ searchTools ++ devTools ++ cargoTools ++ pythonTools ++ nodeTools;

          shellHook = ''
            if [ -f ~/.commonrc ]; then
              source ~/.commonrc
            fi
            if command -v zsh &> /dev/null && [ -z "$ZSH_VERSION" ]; then
              exec "$(command -v zsh)" -l
            fi
          '';
        };

        devShells.desktop = pkgs.mkShell {
          buildInputs = waylandTools ++ fonts ++ [
            pkgs.neovim
            pkgs.git
          ];

          shellHook = ''
            if [ -f ~/.commonrc ]; then
              source ~/.commonrc
            fi
            if command -v zsh &> /dev/null && [ -z "$ZSH_VERSION" ]; then
              exec "$(command -v zsh)" -l
            fi
          '';
        };

        # Packages that can be built/installed
        packages = {
          default = pkgs.buildEnv {
            name = "nix-user-env";
            paths = allPackages;
            pathsToLink = [ "/bin" "/share" "/lib" ];
          };

          minimal = pkgs.buildEnv {
            name = "nix-user-env-minimal";
            paths = shellTools ++ modernCLI ++ searchTools;
            pathsToLink = [ "/bin" "/share" ];
          };

          dev = pkgs.buildEnv {
            name = "nix-user-env-dev";
            paths = shellTools ++ modernCLI ++ searchTools ++ devTools ++ cargoTools ++ pythonTools ++ nodeTools;
            pathsToLink = [ "/bin" "/share" "/lib" ];
          };
        };

        # Home Manager module (optional, for integration)
        homeManagerModules.default = { config, lib, pkgs, ... }: {
          home.packages = allPackages;
          
          programs.zsh = {
            enable = true;
            enableCompletion = true;
            autosuggestion.enable = true;
            syntaxHighlighting.enable = true;
            
            initExtra = ''
              # Source common config
              if [ -f ~/.commonrc ]; then
                source ~/.commonrc
              fi
              
              # Powerlevel10k instant prompt
              if [[ -r "''${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-''${(%):-%n}.zsh" ]]; then
                source "''${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-''${(%):-%n}.zsh"
              fi
            '';
          };

          programs.bash = {
            enable = true;
            initExtra = ''
              if [ -f ~/.commonrc ]; then
                source ~/.commonrc
              fi
            '';
          };

          # Configure modern CLI tools
          programs.bat.enable = true;
          programs.eza.enable = true;
          programs.fzf.enable = true;
          programs.zoxide.enable = true;
          programs.git.enable = true;
        };
      }
    );
}
