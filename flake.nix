{
  description = "PearAI - AI Powered Code Editor";
  inputs = {
    nixpkgs.url = "flake:nixpkgs/nixpkgs-unstable";
  };
  outputs = inputs:
    let
      flakeContext = {
        inherit inputs;
      };
    in
    {
      devShells = {
        aarch64-linux = {
          arm64 = import ./devShells/arm64.nix flakeContext { system = "aarch64-linux"; };
        };
        x86_64-linux = {
          x86_64 = import ./devShells/x86_64.nix flakeContext { system = "x86_64-linux"; };
        };
      };
    };
}
