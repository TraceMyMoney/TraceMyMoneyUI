import axios from "axios";
import { traceMyMoneyStore } from "@/stores/traceMyMoneyStore";

export const filterValidExpenses = (expenseList) => {
    let validEntries = expenseList.filter(ele => ele.amount && ele.description)
    validEntries = validEntries.map((ele) => {
        if (ele.amount < 0) {
            return {
            "amount": ele.amount,
            "description": ele.description,
            "expense_entry_type": "ADD"
            }
        } else {
            return ele
        }
    })

    return validEntries
}

function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

export const fetchAccessToken = () => {
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
        axios.defaults.headers.common["x-access-token"] = accessToken
        const parsedData = parseJwt(accessToken);
        if (parsedData) {
            traceMyMoneyStore().setUserName(parsedData["user_name"])
            traceMyMoneyStore().setLoggedInStatus(true)
        }
    } else {
        traceMyMoneyStore().setLoggedInStatus(false)
    }
}

export const handleError = (err) => {
  console.log(err)
  let pushToData = null;
  if (err.status == 401) {
      if (localStorage.getItem("access_token")) {
          localStorage.removeItem("access_token")
          pushToData = "Please login again !"
      }
      fetchAccessToken()
  } else if(err.status == 400){
    pushToData = err?.response?.data?.error
    if (Array.isArray(err?.response?.data?.errors)) {
      const errorResponse = err?.response?.data?.errors[0]
      const errorResponseMessage = Object.keys(errorResponse)
              .map(field => `${field.charAt(0).toUpperCase() + field.slice(1)}: ${errorResponse[field]}`)
              .join(", ")
      pushToData = errorResponseMessage
    }
  } else {
      pushToData = err?.message
  }
  return pushToData
}

export const formatMyDates = (date) => {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
