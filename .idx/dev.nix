# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    # Installs Node.js version 20
    pkgs.nodejs_20
  ];

  # Sets environment variables in the workspace
  env = {};

  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "google.gemini-cli-vscode-ide-companion",
      # Recommended for JavaScript/TypeScript projects
      "dbaeumer.vscode-eslint"
    ];

    # Enable previews
    previews = {
      enable = true;
      previews = {
        web = {
          # The command to start your web server.
          # It should listen on the port provided by the $PORT environment variable.
          command = ["npm" "start"];
          manager = "web";
        };
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        # Install project dependencies from package.json
        npm-install = "npm install";
        # Open editors for the following files by default
        default.openFiles = [ "index.js" "kaisai.js" "scraper.js" ".idx/dev.nix" ];
      };

      # Runs when the workspace is (re)started
      onStart = {
        # The preview service defined above already starts the server.
      };
    };
  };
}
