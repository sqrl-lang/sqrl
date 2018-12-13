"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function register(registry) {
    registry.registerSync(function simhash(text) {
        return "00000000";
    });
}
exports.register = register;
