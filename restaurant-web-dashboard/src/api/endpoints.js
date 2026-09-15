const ENDPOINTS={

    AUTH:{

        LOGIN:"/hotel/login",

        PROFILE:"/hotel/profile"
    },

    EMPLOYEES:{

        LIST:"/employees",

        CREATE:"/employees",

        UPDATE:(id)=>`/employees/${id}`,

        DELETE:(id)=>`/employees/${id}`
    },

    DEPARTMENTS:{

        LIST:"/departments",

        CREATE:"/departments"
    },

    ATTENDANCE:{

        LIST:"/attendance"
    }

}

export default ENDPOINTS;