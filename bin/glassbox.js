#!/usr/bin/env node
// Thin shebang wrapper — delegates all logic to src/cli.js (OBJ-4, NFR-02).
import { main } from '../src/cli.js';
main(process.argv.slice(2));
