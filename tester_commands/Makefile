# Compiler and flags
CC = gcc
CFLAGS = -Wall -Wextra -O2

SRC = $(wildcard *.c)
BIN = $(SRC:.c=)

PREFIX = $(HOME)/.local
BINDIR = $(PREFIX)/bin

all: $(BIN)

%: %.c
	$(CC) $(CFLAGS) -o $@ $<

install: all
	mkdir -p $(BINDIR)
	cp $(BIN) $(BINDIR)

clean:
	rm -f $(BIN)