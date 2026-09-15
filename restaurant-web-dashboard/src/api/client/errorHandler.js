import api from "./axios";

api.interceptors.response.use(

    (response)=>response,

    (error)=>{

        if(error.response?.status===401){

            localStorage.clear();

            window.location="/";
        }

        return Promise.reject(error);

    }

);