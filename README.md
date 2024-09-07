# Lancode
A platform for hosting local leetcode workshops.

## Usage
### Question list
You can use the provided question list, or create your own however you like. Included in the repo is `gencsv.py`, which scales question difficulties based on another project - `data.json` from https://github.com/zerotrac/leetcode_problem_rating.

### Environment variables and secrets
Provided is a file `sample.env`. Rename this file to `.env` and fill in your cookies. You can find these cookies from your own browser in the cookies tab and the network tab when you navigate to leetcode.com. Alternatively, you can use [Postman Interceptor](https://www.postman.com/product/postman-interceptor/), or any other similar tool.

### Running the server
To install dependencies, run
```shell
npm install
```

To start the server, run
```shell
node index.js
```
