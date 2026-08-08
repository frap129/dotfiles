use bash-env.nu
export def --env main [] {
    ls ~/.config/environment.d/*.conf
    | sort-by name
    | each --flatten {|file|
        open --raw $file.name
        | lines
        | where {|line| ($line | str trim) != "" }
        | each {|line|
            if ($line | str trim | str starts-with "#") {
                $line
            } else {
                $"export ($line)"
            }
        }
    }
    | bash-env
    | load-env
}
