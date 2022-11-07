const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const Token = require("../models/Token");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const { response } = require("express");
exports.postProduct = (req, res, next) => {
  const title = req.body.title;
  const price = req.body.price;
  const desc = req.body.desc;
  const imageUrl = req.body.imageUrl;
  if (!title || parseInt(price) <= 0 || !desc || !imageUrl)
    return res.status(500).json({ error: "err in fields" });
  const product = new Product(title, price, desc, imageUrl);
  product
    .save()
    .then(() => {
      return res.json({ message: "product added" });
    })
    .catch((err) => {
      return res.status(500).json({ error: "err" });
    });
};
exports.fetchAllProducts = (req, res, next) => {
  Product.fetchAll()
    .then((response) => {
      res.setHeader("Set-Cookie", "loggedIn=true");
      return res.json({ products: response });
    })
    .catch((err) => {
      return res.status(500).json({ error: "err" });
    });
};

exports.placeOrder = (req, res, next) => {
  const userid = req.body.username;
  const products = req.body.products;
  if (!userid || !Array.isArray(products))
    return res.status(500).json({ error: "Err in fields" });
  const order = new Order(userid, products);
  order
    .placeOrder()
    .then(() => {
      return res.json({ message: "Order placed" });
    })
    .catch((err) => {
      return res.status(500).json({ error: "Err" });
    });
};

exports.fetchUserOrders = (req, res, next) => {
  const userid = req.body.username;
  if (!userid) return res.status(500).json({ error: "Err No userid" });
  Order.fetchOrderByUserId(userid)
    .then((response) => {
      return res.json({ orders: response });
    })
    .catch((err) => {
      return res.status(500).json({ error: "Err" });
    });
};
exports.cancelOrder = (req, res, next) => {
  const orderId = req.body.orderid;
  if (!orderId) return res.status(500).json({ error: "Err No orderid" });
  const positiveCallback = (action) => {
    return res.json({ message: `${action} successfully` });
  };
  const negativeCallback = () => {
    return res.status(500).json({ error: "Err" });
  };
  Order.cancelOrderById(orderId, positiveCallback, negativeCallback);
};
exports.getAllOrders = (req, res, next) => {
  Order.getAllOrders()
    .then((response) => {
      return res.json({ orders: [...response] });
    })
    .catch((err) => {
      return res.status(500).json({ error: "Err" });
    });
};
exports.processOrder = (req, res, next) => {
  const orderId = req.body.orderid;
  const positiveCallback = (action) => {
    return res.json({ message: `${action} successfully` });
  };
  const negativeCallback = () => {
    return res.status(500).json({ error: "Err" });
  };
  Order.processOrderById(orderId, positiveCallback, negativeCallback);
};
exports.registerUser = (req, res, next) => {
  const username = req.body.username;
  const pwd = req.body.password;
  const user = new User(username, pwd);
  const sendEmailHandler = async (url) => {
    try {
      await sendEmail(username, "Verify Email", url);
      return 1;
    } catch (err) {
      console.log(err);
      throw new Error("Error in sending verifcation email");
    }
  };
  const positiveCallback = async (action) => {
    console.log("In pcb");
    const token = new Token(username, 100);
    try {
      await token.createToken();
    } catch (err) {
      console.log("Token Creation Error " + err);
      return res.status(500).json({ error: `Error in creating token ` });
    }

    const url = `http://localhost:3000/${username}/verify/${100}`;
    sendEmailHandler(url)
      .then((response) => {
        if (response === 1)
          return res
            .status(201)
            .json({ message: `Account created successfully` });
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json({ error: `Error in sending email` });
      });
  };
  const negativeCallback = (msg) => {
    return res.status(409).json({ error: msg });
  };
  user.register(positiveCallback, negativeCallback);
};
exports.loginUser = (req, res, next) => {
  const username = req.body.username;
  const pwd = req.body.password;
  const positiveCallback = () => {
    //JWT implementation
    const token = jwt.sign({ user: username }, "secret+key", {
      expiresIn: "24h",
    });
    return res.status(200).json({ accessToken: token });
  };
  const negativeCallback = (msg) => {
    return res.status(400).json({ error: msg });
  };
  try {
    User.login(username, pwd, positiveCallback, negativeCallback);
  } catch (err) {
    return res.status(500).json({ error: "Err" });
  }
};
exports.verifyEmail = (req, res, next) => {
  const userId = req.params.userId;
  const token = Number(req.params.token);

  const positiveCallback = async () => {
    try {
      const response = await Token.findToken(userId, token);
      console.log(response);
      if (response?.deletedCount === 1) {
        // Delete count returned
        try {
          await User.verifyUser(userId);
        } catch (err) {
          return res.status(500).json({ err: "Error in verifying" });
        }
        return res.status(200).json({ msg: "Account verifed" });
      } else throw new Error("Error in delete count");
    } catch (err) {
      return res.status(500).json({ err: "Token not found" });
    }
  };
  const negativeCallback = (msg) => {
    return res.status(400).json({ err: msg });
  };
  const isUserPresent = () => {
    try {
      User.findUser(userId, positiveCallback, negativeCallback);
    } catch (err) {
      return res.status(500).json({ err: "Error Reaching server" });
    }
  };

  //Check whether the userid is valid
  isUserPresent();
};
exports.resendVerification = (req, res, next) => {
  const userId = req.body.userId;
  const token = new Token(userId, 100);
  const createToken = async () => {
    try {
      await token.createToken();
    } catch (err) {
      console.log(err);
      return res.status(500).json({ err: "Erron in creating token" });
    }
  };
  createToken().then(() => {
    //const url = `http://localhost:8080/api/${username}/verify/${200}`;
    return res
      .status(201)
      .json({ message: `Verication email resent successfullyy` });
    /*sendEmailHandler(url)
      .then((response) => {
        if (response === 1)
          return res
            .status(201)
            .json({ message: `Verication email resent successfullyy` });
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json({ message: `Error in sending email` });
      });*/
  });
};
