"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const invariant_1 = require("sqrl/lib/jslib/invariant");
class CloseableGroup {
    constructor() {
        this.list = [];
        this.closed = false;
    }
    add(obj) {
        invariant_1.default(!this.closed, "The closeable group has already been closed.");
        this.list.push(obj);
    }
    close() {
        this.closed = true;
        this.list.forEach(o => o.close());
        this.list = [];
    }
}
exports.CloseableGroup = CloseableGroup;
