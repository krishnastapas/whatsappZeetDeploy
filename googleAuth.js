import axios from "axios"

export const googleAuth= async(token)=>{
    var data = JSON.stringify({
        "idToken": token
      });
    const config={
        method: 'post',
        url:'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyBXq0konJnsdLJgdjMaIWo6EIf8JXqpNoQ&key',
        headers: { 
            'Content-Type': 'application/json'
          },
        data: data
    }
    var google_res=await axios(config)
    .then(response =>{
       return response;
       
    })
    .catch(function (error) {
      return error;
    })

    return google_res;
}
