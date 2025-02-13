const express = require('express');
const app = express();
app.use(express.static('./'));
const port = 8080;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});