import { listen } from "@colyseus/tools";
import app from "./app.config";

listen(app, { host: "0.0.0.0" }).then(() => {
    console.log("⚔️  Listening on http://0.0.0.0:2567");
});
