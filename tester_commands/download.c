#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main(int argc, char **argv) {
    if (argc != 2) {
        fprintf(stderr, "Usage: %s <file_id>\n", argv[0]);
        return 1;
    }

    char request[512];
    snprintf(request, sizeof(request),
             "http://localhost:5000/download/%s", argv[1]);

    char *args[] = {
        "curl",
        "-O",       // save file with its original name
        request,
        NULL
    };

    execvp("curl", args);

    perror("execvp"); // only runs if execvp fails
    return 1;
}