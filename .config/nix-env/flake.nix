{
  description = "Portable mise bootstrap environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    mise = {
      url = "github:jdx/mise/v2026.7.18";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { nixpkgs, flake-utils, mise, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        packages.default = pkgs.buildEnv {
          name = "nix-user-env";
          paths = [
            mise.packages.${system}.default
            pkgs.yadm
          ];
          pathsToLink = [ "/bin" "/share" ];
        };
      });
}
