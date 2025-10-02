#include <stdio.h>
#include <stdlib.h>

int main (int argc, char **argv) {
    if (argc != 2) {
        printf("Illegal number of arguments!\n");
        return 1;
    }

    char *args[] = {
        "curl",
        "-F", NULL,
        "http://localhost:5000/upload",
        NULL
    };

    char form[256];
    snprintf(form, sizeof(form), "file=@%s", argv[1]);
    args[2] = form;

    execvp("curl", args);

    perror("execvp"); // only runs if execvp fails
    return 1;

}