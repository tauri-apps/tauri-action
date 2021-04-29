if git rev-parse v$1 >/dev/null 2>&1
then
    echo "$1"
fi
