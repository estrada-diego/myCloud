#include <stdio.h>
#include <stdlib.h>

int main(int argc, char **argv) {
    if (argc != 1) {
        printf("Illegal number of arguments!\n");
        return 1;
    }

    char *args[] = {
        "curl",
        "http://localhost:5000/files?format=text",
        NULL
    };

    execvp("curl", args);

    perror("execvp"); // only runs if execvp fails
    return 1;
}