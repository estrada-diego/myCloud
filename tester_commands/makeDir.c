#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>   // for execvp
#include <string.h>

int main (int argc, char **argv) {
    if (argc != 2) {
        printf("Usage: %s <dirname>\n", argv[0]);
        return 1;
    }

    char json[512];
    snprintf(json, sizeof(json), "{\"dirname\":\"%s\"}", argv[1]);

    char *args[] = {
        "curl",
        "-X", "POST",
        "-H", "Content-Type: application/json",
        "-d", json,
        "http://localhost:5000/mkdir",
        NULL
    };

    execvp("curl", args);

    perror("execvp"); 
    return 1;
}