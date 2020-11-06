/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import {TextEncoder} from 'util';

declare global {
    // TextEncoder is available as a global since node v12
    export const TextEncoder: new () => TextEncoder;
}