import { handleAskRequest } from '../src/server/aiHandler.js';

export default {
  fetch(request) {
    return handleAskRequest(request);
  },
};
