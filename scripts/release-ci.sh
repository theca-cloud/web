#!/usr/bin/env sh
# The release pipeline's steps (.woodpecker/release.yaml). The version is
# package.json's (written by scripts/release.sh). Needs GITEA_TOKEN.
#   tags     the image tags in .tags: X.Y.Z, X.Y, X, latest on prod (refusing a
#            version already released); X.Y.Z-rc, X.Y-rc, X-rc, rc on dev; and
#            the core it's for, as the image's label `org.theca.core`
#   publish  the tag and the Gitea release: the core it's for, and this
#            version's changelog (prod)
#            DRY_RUN=1: prints the release, publishes nothing
set -eu
cd "$(dirname "$0")/.."

gitea=https://git.pband.ch
repo=theca/web
version=$(jq -r .version package.json)
# The core release this build is for: the one pin (decisions.md, web pins core).
core=$(jq -r '.dependencies["@theca/client"]' package.json)
branch=${CI_COMMIT_BRANCH:-$(git branch --show-current)}

case "${1:-}" in
tags)
    major=${version%%.*}
    minor=${version#*.}
    minor=$major.${minor%%.*}
    if [ "$branch" = prod ]; then
        if curl -fsS -o /dev/null -H "Authorization: token $GITEA_TOKEN" \
            "$gitea/api/v1/repos/$repo/releases/tags/v$version"; then
            echo "v$version is already released: run scripts/release.sh on dev first" >&2
            exit 1
        fi
        printf '%s\n' latest "$major" "$minor" "$version" >.tags
    else
        printf '%s\n' rc "$major-rc" "$minor-rc" "$version-rc" >.tags
    fi
    cat .tags
    # The image says which core it's for, read from the registry without
    # pulling (`ce` picks its core from it). The buildx plugin's build args are
    # static: the label goes into the Dockerfile the image step builds.
    printf 'LABEL org.theca.core="%s"\n' "$core" >>Dockerfile
    tail -1 Dockerfile
    ;;
publish)
    notes=$(awk -v v="## [$version]" 'index($0, v) == 1 {on = 1; next} /^## \[/ {on = 0} on' CHANGELOG.md)
    notes=$(printf 'Built for core %s.\n%s' "$core" "$notes")
    release=$(jq -n --arg tag "v$version" --arg sha "${CI_COMMIT_SHA:-$(git rev-parse HEAD)}" --arg body "$notes" \
        '{tag_name: $tag, target_commitish: $sha, name: $tag, body: $body}')
    if [ -n "${DRY_RUN:-}" ]; then
        printf '%s\n' "$release"
        exit 0
    fi
    # printf, not echo: sh's echo turns the notes' \n into line breaks (invalid
    # JSON); --data-binary, not -d, which strips them.
    printf '%s\n' "$release" |
        curl -fsS -X POST -H "Authorization: token $GITEA_TOKEN" -H 'Content-Type: application/json' \
            --data-binary @- "$gitea/api/v1/repos/$repo/releases" >/dev/null
    echo "Released v$version"
    ;;
*)
    echo "usage: scripts/release-ci.sh tags|publish" >&2
    exit 2
    ;;
esac
