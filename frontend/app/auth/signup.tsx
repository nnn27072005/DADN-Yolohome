import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  Platform,
} from "react-native";
import { router, Link } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { apiCall } from "@/utils/apiCall";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function SignupScreen() {
  const [username, setUsername] = useState("");
  const [fullname, setFullname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const fullnameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

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
      return response;
    },
    onSuccess: async () => {
      alert("Đăng ký thành công! Vui lòng đăng nhập.");
      router.replace("/auth/login");
    },
    onError: (error) => {
      alert("Lỗi đăng ký: " + error.message);
    },
  });

  return (
    <ImageBackground
      source={require("../../assets/images/yolohome-login-bg.png")}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIconBox}>
            <MaterialCommunityIcons name="transit-connection-variant" size={32} color="#FF9500" />
          </View>
          <Text style={styles.logoTitle}>
            Yolo<Text style={{ color: "#FF9500" }}>home</Text>
          </Text>
        </View>

        {/* Simplified Signup Frame */}
        <View style={styles.card}>
          <Text style={styles.welcomeText}>Đăng ký</Text>

          {/* Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tên đăng nhập</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="account-outline" size={20} color="#1A1A2E" style={styles.inputIcon} />
              <TextInput
                placeholder="Nhập tên đăng nhập"
                placeholderTextColor="#A0A0B0"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => fullnameInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Full Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Họ và tên</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="badge-account-outline" size={20} color="#1A1A2E" style={styles.inputIcon} />
              <TextInput
                ref={fullnameInputRef}
                placeholder="Nhập họ và tên"
                placeholderTextColor="#A0A0B0"
                value={fullname}
                onChangeText={setFullname}
                style={styles.input}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mật khẩu</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#1A1A2E" style={styles.inputIcon} />
              <TextInput
                ref={passwordInputRef}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#A0A0B0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={[styles.input, { flex: 1 }]}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialCommunityIcons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#1A1A2E"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity style={styles.primaryButton} onPress={handleSignup}>
            <Text style={styles.primaryButtonText}>Đăng ký ngay</Text>
          </TouchableOpacity>

          <Text style={styles.footerLinkText}>
            Đã có tài khoản?{" "}
            <Link href="/auth/login" style={styles.signupLink}>
              Đăng nhập
            </Link>
          </Text>
        </View>
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoIconBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 149, 0, 0.3)",
    backgroundColor: "rgba(255, 149, 0, 0.05)",
    marginBottom: 10,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A1A2E",
    letterSpacing: 1,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(26, 26, 46, 0.95)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: "0px 10px 15px rgba(0, 0, 0, 0.3)",
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 24,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A0A0B0",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#1A1A2E",
    fontSize: 14,
    fontWeight: "500",
  },
  primaryButton: {
    backgroundColor: "#FF8C00",
    borderRadius: 10,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  footerLinkText: {
    fontSize: 14,
    color: "#A0A0B0",
    textAlign: "center",
  },
  signupLink: {
    color: "#FF9500",
    fontWeight: "bold",
  },
});
