import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
} from "react-native";
import { router, Link } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { apiCall } from "@/utils/apiCall";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupScreen() {
  const [username, setUsername] = useState("");
  const [fullname, setFullname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = () => {
    signup();
  };

  const { mutate: signup } = useMutation({
    mutationFn: async () => {
      const response = await apiCall({
        method: "POST",
        endpoint: "/register",
        body: {
          username,
          password,
          fullname,
        },
      });
      console.log("Response", response);
      return response;
    },
    onSuccess: async () => {
      console.log("Signup success");
      router.replace("/auth/login");
    },
  });

  return (
    <ImageBackground
      source={require("../../assets/images/yolohome-login-bg.png")}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Text style={[styles.title, { color: "#1A1A2E", marginVertical: 40 }]}>
          Yolo<Text style={{ color: "#FF9500" }}>Home</Text>
        </Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: "#f80404ff" }]}>Tên đăng nhập</Text>
            <TextInput
              placeholder=""
              value={username}
              onChangeText={setUsername}
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: "#f80404ff" }]}>Họ và tên</Text>
            <TextInput
              placeholder=""
              value={fullname}
              onChangeText={setFullname}
              style={styles.input}
            />
          </View>

          <View style={[styles.inputContainer, { position: "relative" }]}>
            <Text style={[styles.label, { color: "#f80404ff" }]}>Mật khẩu</Text>
            <TextInput
              placeholder=""
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={[styles.input, { paddingRight: 40 }]}
              onSubmitEditing={handleSignup}
              returnKeyType="join"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: 16,
                top: 42,
              }}
            >
              {showPassword ? (
                <Image
                  source={require("@/assets/images/show.png")}
                  style={{
                    width: 20,
                    height: 20,
                  }}
                />
              ) : (
                <Image
                  source={require("@/assets/images/hide.png")}
                  style={{ width: 20, height: 20 }}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleSignup}>
          <Text style={styles.loginButtonText}>Đăng ký</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Đã có tài khoản?{" "}
          <Link href="/auth/login" style={styles.signupLink}>
            Đăng nhập
          </Link>
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    height: "100%",
    width: "100%",
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 40,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  green: {
    color: "#228B22",
  },
  orange: {
    color: "#FF8C00",
  },
  form: {
    width: "75%",
    gap: 10,
  },
  input: {
    backgroundColor: "white",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 14,
    elevation: 2,
  },
  inputContainer: {
    gap: 12,
  },

  label: {
    paddingLeft: 4,
    fontWeight: "500",
    fontSize: 14,
    color: "#555",
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  loginButton: {
    backgroundColor: "#FF8C00",
    paddingVertical: 12,
    width: "75%",
    alignItems: "center",
    borderRadius: 30,
    marginTop: 24,
    elevation: 3,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: 500,
    fontSize: 18,
  },
  footerText: {
    marginTop: 16,
    fontSize: 14,
    color: "#333",
  },
  signupLink: {
    color: "#FF9500",
    fontWeight: "600",
  },
});
