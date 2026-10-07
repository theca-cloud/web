# The web image: the app's static build only, nothing to run. `ce` copies it
# into its image and points the core server at it (WEB_DIR).
FROM scratch
COPY build/ /web/
